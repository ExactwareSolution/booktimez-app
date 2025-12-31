async function canCreateCategory(business, currentCategoryCount) {
  if (!business || !business.Plan) return true;
  const max = business.Plan.maxCategories;
  if (max === null || max === undefined) return true;
  return currentCategoryCount < max;
}

async function canCreateAppointment({ business, monthBookingsCount }) {
  if (!business || !business.Plan) return true;
  const max = business.Plan.maxBookingsPerMonth;
  if (max === null || max === undefined) return true;
  return monthBookingsCount < max;
}

module.exports = { canCreateCategory, canCreateAppointment };
