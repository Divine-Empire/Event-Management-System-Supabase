/**
 * Draw algorithm for Customer Reward Event Management System.
 * 
 * Rules:
 * 1. Only participants who have JOINED, are PARTICIPATING, and have chosen a LUCKY NUMBER are eligible.
 * 2. Selection is done by LUCKY NUMBER (000 - 999).
 * 3. If multiple participants share the selected lucky number, ALL win that rank prize.
 * 4. Won lucky numbers (and all their participants) are excluded from subsequent prize draws.
 */

export function drawNextRankWinner(rank, prizeName, participants = [], existingWinners = []) {
  // Exclude lucky numbers that have already won
  const wonLuckyNumbers = new Set(
    existingWinners.map(w => String(w.luckyNumber || w.winningNumber || w.invoiceNumber || w.invoiceNo).trim())
  );
  
  // Eligible pool: joined & participating participants with a valid lucky number who haven't won yet
  const eligible = participants.filter(p => {
    if (!p.joined || !p.participating || p.winner || !p.luckyNumber) return false;
    const num = String(p.luckyNumber).trim();
    return num && !wonLuckyNumbers.has(num);
  });
  
  if (eligible.length === 0) {
    return null;
  }

  // Get distinct eligible lucky numbers
  const distinctLuckyNumbers = Array.from(new Set(eligible.map(p => String(p.luckyNumber).trim())));
  const winningLuckyNumber = distinctLuckyNumbers[Math.floor(Math.random() * distinctLuckyNumbers.length)];

  // All participants with that winning lucky number
  const winners = eligible.filter(p => String(p.luckyNumber).trim() === winningLuckyNumber);

  const primaryWinnerName = winners.map(w => w.customerName || w.name).join(', ');

  return {
    id: winners[0]?.id || `w_${Date.now()}`,
    rank,
    winnerRank: rank,
    prizeName: prizeName || `Rank ${rank} Prize`,
    luckyNumber: winningLuckyNumber,
    winningNumber: winningLuckyNumber,
    customerName: primaryWinnerName,
    name: primaryWinnerName,
    customerNames: primaryWinnerName,
    invoiceNumber: winners.map(w => w.invoiceNumber || w.invoiceNo).join(', '),
    winners: winners.map(w => ({
      id: w.id,
      customerName: w.customerName || w.name,
      mobile: w.mobile || w.phone,
      invoiceNumber: w.invoiceNumber || w.invoiceNo,
      luckyNumber: winningLuckyNumber
    })),
    mobiles: winners.map(w => w.mobile || w.phone).join(', '),
    winnerCount: winners.length,
    drawTime: new Date().toISOString(),
    published: true,
    winner: true
  };
}

export function drawSequentialWinners(participants = [], prizes = [], existingWinners = []) {
  const allWinners = [];
  const combinedExisting = [...existingWinners];

  prizes.forEach(prize => {
    const winnerObj = drawNextRankWinner(prize.rank, prize.name || prize.title, participants, combinedExisting);
    if (winnerObj) {
      allWinners.push(winnerObj);
      combinedExisting.push(winnerObj);
    }
  });

  return allWinners;
}
