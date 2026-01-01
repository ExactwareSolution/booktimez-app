const crypto = require("crypto");
const { Appointment } = require("../models");

/**
 * Generate a unique reference number per business
 */
async function generateReferenceNumber(business) {
  const year = new Date().getFullYear();
  const slug = business.slug.toUpperCase();

  let referenceNumber;
  let exists = true;

  // Keep generating until we find a unique one
  while (exists) {
    const suffix = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6-char hex
    referenceNumber = `${slug}-${year}-${suffix}`;

    // Check DB for uniqueness
    const count = await Appointment.count({
      where: { businessId: business.id, referenceNumber },
    });

    if (count === 0) exists = false; // unique, exit loop
  }

  return referenceNumber;
}

module.exports = generateReferenceNumber;
