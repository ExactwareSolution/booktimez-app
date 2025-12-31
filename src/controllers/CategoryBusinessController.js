const handlers = require("./ServiceController");

// The file `ServiceController.js` was repurposed to implement business-scoped
// category creation/listing. Provide a clear name and re-export the handlers
// so the rest of the codebase can import `CategoryBusinessController` instead
// of referencing "ServiceController".
module.exports = {
  createCategoryForBusiness: handlers.createCategoryForBusiness,
  listCategoriesForBusiness: handlers.listCategoriesForBusiness,
};
