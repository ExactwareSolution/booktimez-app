const { Payment, Business, Plan } = require("../models");

/**
 * GET ALL PAYMENTS
 */
const allPayment = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { isDeleted: false },
      include: [
        {
          model: Business,
          attributes: ["id", "name"],
        },
        {
          model: Plan,
          attributes: ["name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET PAYMENT BY ID
 */
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      where: {
        id: req.params.id,
        isDeleted: false,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * UPDATE PAYMENT
 */
const updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      where: {
        id: req.params.id,
        isDeleted: false,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    await payment.update(req.body);

    return res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: payment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * SOFT DELETE PAYMENT
 */
const softDeletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    await payment.update({ isDeleted: true });

    return res.status(200).json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  allPayment,
  getPaymentById,
  updatePayment,
  softDeletePayment,
};
