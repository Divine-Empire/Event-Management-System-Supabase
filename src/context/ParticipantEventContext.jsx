import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { eventStorage } from '@/services/eventStorage';
import { participantService } from '@/services/participantService';
import { computeEventStatus, EVENT_STATUS } from '@/utils/eventStatus';
import { downloadPassAsImage, downloadPassAsPdf } from '@/utils/generatePassTicket';
import { useEvent } from '@/context/EventContext';
import { toast } from 'sonner';

const ParticipantEventContext = createContext(null);

const SESSION_KEY = 'dei_current_participant';
const participantKey = (eventId) => `dei_logged_participant_${eventId}`;

const saveParticipantSession = (eventId, participant) => {
  if (!eventId || !participant) return;
  try {
    const value = JSON.stringify(participant);
    sessionStorage.setItem(participantKey(eventId), value);
    sessionStorage.setItem(SESSION_KEY, value);
    localStorage.setItem(participantKey(eventId), value);
    localStorage.setItem(SESSION_KEY, value);
  } catch (error) {
    console.error('Failed to persist participant session:', error);
  }
};

const readParticipantSession = (eventId) => {
  if (!eventId) return null;
  try {
    const scoped = sessionStorage.getItem(participantKey(eventId));
    if (scoped) return JSON.parse(scoped);
    const current = sessionStorage.getItem(SESSION_KEY);
    if (current) return JSON.parse(current);
    const localScoped = localStorage.getItem(participantKey(eventId));
    if (localScoped) return JSON.parse(localScoped);
    const localCurrent = localStorage.getItem(SESSION_KEY);
    if (localCurrent) return JSON.parse(localCurrent);
  } catch (error) {
    console.error('Failed to restore participant session:', error);
  }
  return null;
};

const clearParticipantSession = (eventId) => {
  try {
    sessionStorage.removeItem(participantKey(eventId));
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(participantKey(eventId));
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear participant session:', error);
  }
};

export const ParticipantEventProvider = ({ children }) => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { registerParticipant, assignLuckyNumber, joinEvent } = useEvent();

  const [event, setEvent] = useState(null);
  const [prizesNabl, setPrizesNabl] = useState([]);
  const [prizesTs, setPrizesTs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [serviceType, setServiceType] = useState('NABL_CALIBRATION');
  const [digitInputs, setDigitInputs] = useState(['', '', '']);

  const [verifiedParticipant, setVerifiedParticipant] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const computedStatus = useMemo(() => {
    const allPrizes = [...prizesNabl, ...prizesTs];
    return computeEventStatus(event, [], allPrizes);
  }, [event, prizesNabl, prizesTs]);

  const loadEvent = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const evt = await eventStorage.getEventByToken(token);
      if (!evt) {
        setEvent(null);
        return;
      }

      setEvent(evt);
      setPrizesNabl(evt.prizesNabl || evt.prizes || []);
      setPrizesTs(evt.prizesTs || evt.prizes || []);

      const storedParticipant = readParticipantSession(evt.id);
      if (!storedParticipant) return;

      setVerifiedParticipant(storedParticipant);

      if (storedParticipant.participating) {
        if (!storedParticipant.joined) {
          const joined = await joinEvent(storedParticipant.id, evt.id);
          saveParticipantSession(evt.id, joined || storedParticipant);
        }
        navigate(`/live/${token || evt.token}`, { replace: true });
      } else if (storedParticipant.luckyNumber) {
        navigate(`/event/${token}/waiting`, { replace: true });
      } else {
        navigate(`/event/${token}/lucky-number`, { replace: true });
      }
    } catch (error) {
      console.error('Error fetching participant event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [token]);

  const handleRegisterOrVerify = async (e) => {
    e.preventDefault();
    setNotFound(false);

    if (!name.trim() || !mobile.trim() || !invoiceNumber.trim()) {
      toast.error('Please enter Full Name, Mobile Number, and Invoice Number');
      return;
    }

    if (!event) {
      toast.error('Event not found');
      return;
    }

    setIsSubmitting(true);
    try {
      const reg = await participantService.verifyRegistrationDetails(event.id, {
        name: name.trim(),
        mobile: mobile.trim(),
        invoiceNumber: invoiceNumber.trim(),
        serviceType
      });

      if (!reg) {
        setVerifiedParticipant(null);
        setNotFound(true);
        return;
      }

      if (reg.luckyNumber && reg.participating) {
        if (!reg.joined) {
          try {
            await joinEvent(reg.id, event.id);
          } catch (error) {
            console.error('Error marking participant as joined:', error);
          }
        }

        saveParticipantSession(event.id, reg);
        toast.success('Participation Approved! Redirecting to live draw...');
        navigate(`/live/${token || event.token}`);
        return;
      }

      if (reg.luckyNumber && !reg.participating) {
        setVerifiedParticipant(reg);
        saveParticipantSession(event.id, reg);
        navigate(`/event/${token}/waiting`);
        return;
      }

      setVerifiedParticipant(reg);
      saveParticipantSession(event.id, reg);
      toast.success('Registration details verified! Please enter your 3-digit lucky number below.');
      navigate(`/event/${token}/lucky-number`);
    } catch (error) {
      console.error(error);
      if (error?.message === 'INVOICE_MOBILE_MISMATCH') {
        toast.error('Mobile number does not match our records for this invoice number.');
      } else if (error?.message === 'NAME_MISMATCH') {
        toast.error('Customer name does not match our records for this invoice number.');
      } else if (error?.message === 'SERVICE_TYPE_MISMATCH') {
        toast.error('Selected service type does not match our records for this invoice number.');
      } else if (error?.message === 'MOBILE_ALREADY_REGISTERED') {
        toast.error('Mobile number is already registered under a different invoice number.');
      } else {
        toast.error('Registration / Verification failed. Please check your details and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDigitChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal && value !== '') return;

    const singleDigit = cleanVal.slice(-1);
    const newDigits = [...digitInputs];
    newDigits[index] = singleDigit;
    setDigitInputs(newDigits);

    if (singleDigit !== '' && index < 2) {
      document.getElementById(`lucky-digit-input-${index + 1}`)?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && digitInputs[index] === '' && index > 0) {
      document.getElementById(`lucky-digit-input-${index - 1}`)?.focus();
    }
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 3);
    if (!pastedData) return;

    const digits = pastedData.padStart(3, '0').split('');
    setDigitInputs([digits[0] || '0', digits[1] || '0', digits[2] || '0']);
  };

  const handleConfirmLuckyNumber = async (e) => {
    e.preventDefault();
    if (!verifiedParticipant || !event) return;

    const numStr = digitInputs.join('');
    if (numStr.length < 3 || digitInputs.some((digit) => digit === '')) {
      toast.error('Please enter all 3 digits of your lucky number (000 – 999)');
      return;
    }

    const formattedNum = numStr.padStart(3, '0');
    setIsJoining(true);

    try {
      let savedParticipant = null;

      if (verifiedParticipant.id) {
        savedParticipant = await assignLuckyNumber(verifiedParticipant.id, formattedNum, event.id);
      } else {
        savedParticipant = await registerParticipant({
          name: verifiedParticipant.customerName || verifiedParticipant.name,
          mobile: verifiedParticipant.mobile,
          invoiceNumber: verifiedParticipant.invoiceNumber,
          serviceType: verifiedParticipant.serviceType,
          luckyNumber: formattedNum
        }, event.id);
      }

      const participant = savedParticipant || { ...verifiedParticipant, luckyNumber: formattedNum };
      setVerifiedParticipant(participant);
      saveParticipantSession(event.id, participant);
      toast.success(`Lucky Number #${formattedNum} permanently saved & submitted!`);
      navigate(`/event/${token}/submitted`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to assign lucky number. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!verifiedParticipant?.id || !event?.id) return;
    setIsRefreshing(true);

    try {
      const freshParticipant = await participantService.getParticipantById(verifiedParticipant.id);
      if (!freshParticipant) {
        toast.error('Could not fetch latest status. Please try again.');
        return;
      }

      setVerifiedParticipant(freshParticipant);
      saveParticipantSession(event.id, freshParticipant);

      if (freshParticipant.participating) {
        if (!freshParticipant.joined) {
          try {
            await joinEvent(freshParticipant.id, event.id);
          } catch (error) {
            console.error('Error marking participant as joined:', error);
          }
        }
        navigate(`/live/${token || event.token}`);
        return;
      }

      toast.info('Status checked — currently waiting for admin approval.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to refresh status. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGoToLive = async () => {
    if (verifiedParticipant?.id && !verifiedParticipant.joined && event?.id) {
      try {
        const joinedParticipant = await joinEvent(verifiedParticipant.id, event.id);
        if (joinedParticipant) {
          setVerifiedParticipant(joinedParticipant);
          saveParticipantSession(event.id, joinedParticipant);
        }
      } catch (error) {
        console.error('Error marking participant as joined:', error);
      }
    }

    navigate(`/live/${token || event?.token}`);
  };

  const handleDownloadPass = (type = 'image') => {
    if (!verifiedParticipant || !event) {
      toast.error('Participant details not found');
      return;
    }

    try {
      if (type === 'pdf') {
        downloadPassAsPdf(verifiedParticipant, event);
        toast.success('Downloading official Lucky Draw Pass PDF...');
      } else {
        downloadPassAsImage(verifiedParticipant, event);
        toast.success('Downloading official Lucky Draw Pass Ticket Image...');
      }
    } catch (error) {
      console.error('Error downloading pass:', error);
      toast.error('Failed to download pass. Please try again.');
    }
  };

  const handleLogout = () => {
    clearParticipantSession(event?.id);
    setVerifiedParticipant(null);
    setDigitInputs(['', '', '']);
    setName('');
    setMobile('');
    setInvoiceNumber('');
    setNotFound(false);
    navigate(`/event/${token}`, { replace: true });
    toast.info('Logged out of participant session');
  };

  const value = {
    token,
    event,
    prizesNabl,
    prizesTs,
    computedStatus,
    isLoading,
    name,
    setName,
    mobile,
    setMobile,
    invoiceNumber,
    setInvoiceNumber,
    serviceType,
    setServiceType,
    digitInputs,
    verifiedParticipant,
    notFound,
    isSubmitting,
    isJoining,
    isRefreshing,
    handleRegisterOrVerify,
    handleDigitChange,
    handleDigitKeyDown,
    handleDigitPaste,
    handleConfirmLuckyNumber,
    handleRefreshStatus,
    handleGoToLive,
    handleDownloadPass,
    handleLogout,
    reloadEvent: loadEvent
  };

  return (
    <ParticipantEventContext.Provider value={value}>
      {children || <Outlet />}
    </ParticipantEventContext.Provider>
  );
};

export const useParticipantEvent = () => {
  const context = useContext(ParticipantEventContext);
  if (!context) {
    throw new Error('useParticipantEvent must be used inside ParticipantEventProvider');
  }
  return context;
};

export const participantEventStatus = EVENT_STATUS;
