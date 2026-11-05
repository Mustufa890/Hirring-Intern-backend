
const Application = require("../models/Application");
const Internship = require("../models/Internship");
const mongoose = require('mongoose');

// Apply Internship
exports.applyInternship = async (req, res) => {
  try {
    const { internship, resumeUrl, coverLetter } = req.body;

    if (!internship || !resumeUrl) {
      return res.status(400).json({
        message: "Internship ID and resume URL are required"
      });
    }

    if (req.user.role !== "candidate") {
      return res.status(403).json({
        message: "Only candidates can apply"
      });
    }

    const internshipData = await Internship.findById(internship);

    if (!internshipData) {
      return res.status(404).json({
        message: "Internship not found"
      });
    }

    if (internshipData.status !== "open") {
      return res.status(400).json({
        message: "Internship closed"
      });
    }

    const candidateId = req.user.id || req.user._id;

    // Check existing application
    const existingApplication = await Application.findOne({
      internship: internshipData._id,
      applicant: candidateId
    });

    if (existingApplication) {
      return res.status(400).json({
        message: "Already applied for this internship"
      });
    }

    // Create application
    const application = await Application.create({
      internship: internshipData._id,
      applicant: candidateId,
      resumeUrl,
      coverLetter
    });

    // Populate application
    const populatedApplication = await Application.findById(
      application._id
    )
      .populate("applicant", "name email")
      .populate("internship", "title company");

    // Socket notifications
    const io = req.app.get("io");

    if (io) {
      io.to("admins").emit(
        "newApplication",
        populatedApplication
      );

      io.to(`user-${internshipData.company.toString()}`).emit(
        "newCompanyApplication",
        populatedApplication
      );
    }

    return res.status(201).json({
      message: "Application submitted successfully",
      application: populatedApplication
    });

  } catch (err) {
    console.error("Apply Internship Error:", err);

    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};


// Candidate - My Applications
exports.MyApplication = async (req, res) => {
  try {
    if (req.user.role !== "candidate") {
      return res.status(403).json({
        message: "Only candidates can view their applications"
      });
    }

    const userId = req.user.id || req.user._id;

    const applications = await Application.find({
      applicant: userId
    })
      .populate({
        path: "internship",
        populate: {
          path: "company",
          select: "name companyName email"
        }
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: applications.length,
      applications
    });

  } catch (err) {
    console.error("My Application Error:", err);

    return res.status(500).json({
      message: err.message
    });
  }
};


// Company - All Applications
exports.CompanyApplication = async (req, res) => {
  try {
    if (req.user.role !== "company") {
      return res.status(403).json({
        message: "Access denied. Only companies can view applications."
      });
    }

    const userId = req.user.id || req.user._id;

    const internships = await Internship.find({
      company: userId
    }).select("_id");

    const internshipIds = internships.map(
      (item) => item._id
    );

    const applications = await Application.find({
      internship: { $in: internshipIds }
    })
      .populate("applicant", "name email")
      .populate("internship", "title company")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: applications.length,
      applications
    });

  } catch (err) {
    console.error("Company Application Error:", err);

    return res.status(500).json({
      message: err.message
    });
  }
};


// Company - Update Application Status

exports.updateApplication = async (req, res) => {
  try {
    if (req.user.role !== "company") {
      return res.status(403).json({
        message: "Only companies can update application status"
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid application ID"
      });
    }

    const allowedStatus = [
      "pending",
      "received",
      "reviewed",
      "shortlisted",
      "rejected"
    ];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        message: "Invalid Application status"
      });
    }

    const application = await Application.findById(id)
      .populate("internship");

    if (!application) {
      return res.status(404).json({
        message: "Application not found"
      });
    }

    if (!application.internship) {
      return res.status(404).json({
        message: "Associated internship no longer exists"
      });
    }

    const userId = req.user.id || req.user._id;

    if (
      String(application.internship.company) !==
      String(userId)
    ) {
      return res.status(403).json({
        message: "You are not authorized to update this application"
      });
    }

    application.status = status;

    await application.save();

    const io = req.app.get("io");

    if (io && status === "shortlisted") {
      io.to(`user-${application.applicant.toString()}`).emit(
        "applicationShortlisted",
        {
          message: "Congratulations! Your application has been shortlisted.",
          applicationId: application._id
        }
      );
    }

    return res.status(200).json({
      message: "Application updated successfully",
      application
    });

  } catch (err) {
    console.error("Update Application Error:", err);

    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};



// Get Single Application
exports.ApplicationId = async (req, res) => {
  try {
    const application = await Application.findById(
      req.params.id
    )
      .populate("applicant", "name email")
      .populate("internship");

    if (!application) {
      return res.status(404).json({
        message: "Application not found"
      });
    }

    const userId = req.user.id || req.user._id;

    const isApplicant =
      String(application.applicant?._id) === String(userId);

    const isCompany =
      String(application.internship?.company) === String(userId);

    if (!isApplicant && !isCompany) {
      return res.status(403).json({
        message: "Access denied"
      });
    }

    return res.status(200).json({
      application
    });

  } catch (err) {
    console.error("Get Application Error:", err);

    return res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};
