const express = require("express");
const ManageController = require("./manage.controller");
// const config = require("../../../config");
const { authenticateAdminOrSuperAdmin } = require("../../../middleware/auth.middleware");

const router = express.Router();

router
    .post(
        "/add-terms-conditions",
        authenticateAdminOrSuperAdmin,
        ManageController.addTermsConditions
    )
    .get("/get-terms-conditions", ManageController.getTermsConditions)
    .delete(
        "/delete-terms-conditions",
        authenticateAdminOrSuperAdmin,
        ManageController.deleteTermsConditions
    )
    .post(
        "/add-privacy-policy",
        authenticateAdminOrSuperAdmin,
        ManageController.addPrivacyPolicy
    )
    .get("/get-privacy-policy", ManageController.getPrivacyPolicy)
    .delete(
        "/delete-privacy-policy",
        authenticateAdminOrSuperAdmin,
        ManageController.deletePrivacyPolicy
    )
    .post(
        "/add-about-us",
        authenticateAdminOrSuperAdmin,
        ManageController.addAboutUs
    )
    .get("/get-about-us", ManageController.getAboutUs)
    .delete(
        "/delete-about-us",
        authenticateAdminOrSuperAdmin,
        ManageController.deleteAboutUs
    )
    .post("/add-faq", authenticateAdminOrSuperAdmin, ManageController.addFaq)
    .patch(
        "/update-faq",
        authenticateAdminOrSuperAdmin,
        ManageController.updateFaq
    )
    .get("/get-faq", ManageController.getFaq)
    .delete(
        "/delete-faq",
        authenticateAdminOrSuperAdmin,
        ManageController.deleteFaq
    )
    .post(
        "/add-contact-us",
        authenticateAdminOrSuperAdmin,
        ManageController.addContactUs
    )
    .get("/get-contact-us", ManageController.getContactUs)
    .delete(
        "/delete-contact-us",
        authenticateAdminOrSuperAdmin,
        ManageController.deleteContactUs
    )
    .get("/get-privacy-policy1", ManageController.getPrivacyPolicy1);

module.exports = router;
