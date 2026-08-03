const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Role = require("../../models/Role");
const User = require("../../models/User");
const Coupon = require("../../models/Coupon");
const logger = require("../../utils/logger");
const activityLogger = require("../../helpers/activityLogger");

class CouponController {
  async viewCoupons(req, res) {
    const showCoupons = await Coupon.find({ isDeleted: false });
    return res.render("admin/dashboard/coupons", { coupons: showCoupons });
  }

  async createCoupon(req, res) {
    try {
      const {
        code,
        discountType,
        discountValue,
        minAmount,
        maxDiscount,
        validFrom,
        validTill,
        usageLimit,
        status,
      } = req.body;

      if (
        !code ||
        !discountType ||
        !discountValue ||
        !validFrom ||
        !validTill
      ) {
        req.session.errors = { coupon: "Please fill in all required fields." };
        return res.redirect("/web/admin/view/coupons");
      }

      const formattedCode = code.trim().toUpperCase();

      // 2. Check Code Uniqueness
      const existingCoupon = await Coupon.findOne({
        code: formattedCode,
        isDeleted: false,
      });

      if (existingCoupon) {
        req.session.errors = {
          coupon: "A coupon with this code already exists.",
        };
        return res.redirect("/web/admin/view/coupons");
      }

      // 3. Date Validation
      const startDate = new Date(validFrom);
      const endDate = new Date(validTill);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        req.session.errors = { coupon: "Invalid date format provided." };
        return res.redirect("/web/admin/view/coupons");
      }

      if (startDate >= endDate) {
        req.session.errors = {
          coupon: "Valid Till date must be after Valid From date.",
        };
        return res.redirect("/web/admin/view/coupons");
      }

      // 4. Numeric Field Validation
      const parsedDiscount = Number(discountValue);
      if (parsedDiscount <= 0) {
        req.session.errors = {
          coupon: "Discount value must be greater than zero.",
        };
        return res.redirect("/web/admin/view/coupons");
      }

      if (discountType === "percentage" && parsedDiscount > 100) {
        req.session.errors = {
          coupon: "Percentage discount cannot exceed 100%.",
        };
        return res.redirect("/web/admin/view/coupons");
      }

      // 5. Create Document
      const newCoupon = await Coupon.create({
        code: formattedCode,
        discountType,
        discountValue: parsedDiscount,
        minAmount: minAmount ? Number(minAmount) : 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
        validFrom: startDate,
        validTill: endDate,
        usageLimit: usageLimit ? Number(usageLimit) : 1,
        status: status || "active",
      });

      logger.info(`Coupon Created: ${newCoupon._id}`);

      await activityLogger(req, {
        userId: req.user.id,
        module: "Coupon",
        action: "Create",
        description: `Created coupon code ${newCoupon.code}`,
        documentId: newCoupon._id,
      });

      req.session.success = "Coupon created successfully!";
      return res.redirect("/web/admin/view/coupons");
    } catch (error) {
      logger.error(`Create Coupon Error: ${error.message}`);

      req.session.errors = {
        coupon: "Failed to create coupon: " + error.message,
      };
      return res.redirect("/web/admin/view/coupons");
    }
  }

  async updateCoupon(req, res) {
    try {
      const { id } = req.params;
      const {
        code,
        discountType,
        discountValue,
        minAmount,
        maxDiscount,
        validFrom,
        validTill,
        usageLimit,
        status,
      } = req.body;

      const existingCoupon = await Coupon.findOne({
        _id: id,
        isDeleted: false,
      });
      if (!existingCoupon) {
        req.session.errors = { coupon: "Coupon not found." };
        return res.redirect("/web/admin/view/coupons");
      }

      const formattedCode = code.trim().toUpperCase();

      // Check duplicate code on another document
      const duplicateCheck = await Coupon.findOne({
        _id: { $ne: id },
        code: formattedCode,
        isDeleted: false,
      });

      if (duplicateCheck) {
        req.session.errors = {
          coupon: "Another coupon with this code already exists.",
        };
        return res.redirect("/web/admin/view/coupons");
      }

      // Date Validation
      const startDate = new Date(validFrom);
      const endDate = new Date(validTill);

      if (startDate >= endDate) {
        req.session.errors = {
          coupon: "Valid Till date must be after Valid From date.",
        };
        return res.redirect("/web/admin/view/coupons");
      }

      // Update fields
      existingCoupon.code = formattedCode;
      existingCoupon.discountType = discountType;
      existingCoupon.discountValue = Number(discountValue);
      existingCoupon.minAmount = minAmount ? Number(minAmount) : 0;
      existingCoupon.maxDiscount = maxDiscount
        ? Number(maxDiscount)
        : undefined;
      existingCoupon.validFrom = startDate;
      existingCoupon.validTill = endDate;
      existingCoupon.usageLimit = usageLimit
        ? Number(usageLimit)
        : existingCoupon.usageLimit;
      existingCoupon.status = status;

      await existingCoupon.save();

      logger.info(`Coupon Updated: ${existingCoupon._id}`);

      await activityLogger(req, {
        userId: req.user?.id,
        module: "Coupon",
        action: "Update",
        description: `Updated coupon code ${existingCoupon.code}`,
        documentId: existingCoupon._id,
      });

      req.session.success = "Coupon updated successfully!";

      return res.redirect("/web/admin/view/coupons");
    } catch (error) {
      logger.error(`Update Coupon Error: ${error.message}`);

      req.session.errors = {
        coupon: "Failed to update coupon: " + error.message,
      };
      return res.redirect("/web/admin/view/coupons");
    }
  }

  async deleteCoupon(req, res) {
    try {
      const { id } = req.params;

      const coupon = await Coupon.findByIdAndUpdate(
        id,
        { isDeleted: true },
        { new: true },
      );

      if (!coupon) {
        req.session.errors = { coupon: "Coupon not found." };
        return res.redirect("/web/admin/view/coupons");
      }

      req.session.success = "Coupon deleted successfully!";
      return res.redirect("/web/admin/view/coupons");
    } catch (error) {
      logger?.error(`Delete Coupon Error: ${error.message}`);
      req.session.errors = { coupon: "Failed to delete coupon." };
      return res.redirect("/web/admin/view/coupons");
    }
  }
}
module.exports = new CouponController();
