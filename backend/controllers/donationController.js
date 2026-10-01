const DonationCampaign = require('../models/DonationCampaign');
const Donation = require('../models/Donation');
const DonationExpense = require('../models/DonationExpense');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { isStaff } = require('../utils/roles');
const { getSettings } = require('../utils/settingsCache');

// @desc    Create a donation campaign for a post
// @route   POST /api/donations/campaigns
// @access  Private (Post creator or Admin)
const createDonationCampaign = async (req, res) => {
  try {
    const { postId, title, description, goalAmount } = req.body;
    if (!title || !goalAmount) {
      return res.status(400).json({ success: false, message: 'Title and goal amount in NPR are required' });
    }

    const campaign = await DonationCampaign.create({
      post: postId || null,
      title,
      description,
      goalAmount: parseFloat(goalAmount),
      creator: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Donation campaign created successfully',
      data: campaign,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all donation campaigns
// @route   GET /api/donations/campaigns
// @access  Public
const getDonationCampaigns = async (req, res) => {
  try {
    const campaigns = await DonationCampaign.find()
      .populate('creator', 'name profilePicture')
      .populate('post', 'title location category')
      .sort({ createdAt: -1 });

    const formattedCampaigns = campaigns.map((c) => {
      const remainingAmount = Math.max(0, c.goalAmount - c.raisedAmount);
      return {
        ...c.toObject(),
        remainingAmount,
      };
    });

    res.json({
      success: true,
      count: formattedCampaigns.length,
      data: formattedCampaigns,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Submit voluntary donation (Platform or Campaign)
// @route   POST /api/donations
// @access  Private
const submitDonation = async (req, res) => {
  try {
    const { campaignId, type, amount, paymentMethod, donorMessage } = req.body;

    if (!type || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid donation type and amount are required' });
    }

    // Respect the Super Admin "Allow Public Donations" toggle.
    const settings = await getSettings();
    if (!settings.allowPublicDonations) {
      return res.status(403).json({ success: false, message: 'Donations are currently disabled by the administrators.' });
    }

    const transactionId = `HTM-NPR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const donation = await Donation.create({
      donor: req.user._id,
      campaign: campaignId || null,
      type, // 'PLATFORM' or 'CAMPAIGN'
      amount: parseFloat(amount),
      paymentMethod: paymentMethod || 'eSewa',
      transactionId,
      donorMessage: donorMessage || '',
    });

    // If campaign donation, update raisedAmount & donorsCount
    if (type === 'CAMPAIGN' && campaignId) {
      const campaign = await DonationCampaign.findById(campaignId);
      if (campaign) {
        campaign.raisedAmount += parseFloat(amount);
        campaign.donorsCount += 1;
        if (campaign.raisedAmount >= campaign.goalAmount) {
          campaign.status = 'COMPLETED';
        }
        await campaign.save();

        // Notify campaign creator
        await Notification.create({
          recipient: campaign.creator,
          sender: req.user._id,
          type: 'INTEREST',
          title: 'New Campaign Donation Received 💚',
          message: `${req.user.name} donated NPR ${amount} via ${paymentMethod} to "${campaign.title}"`,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: `Thank you for your generous NPR ${amount} ${type === 'PLATFORM' ? 'platform' : 'campaign'} contribution!`,
      data: donation,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get financial transparency ledger for a campaign
// @route   GET /api/donations/campaigns/:id/transparency
// @access  Public
const getFinancialTransparency = async (req, res) => {
  try {
    const campaign = await DonationCampaign.findById(req.params.id)
      .populate('creator', 'name profilePicture')
      .populate('post', 'title');

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const expenses = await DonationExpense.find({ campaign: campaign._id })
      .populate('createdBy', 'name profilePicture')
      .sort({ spentDate: -1 });

    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netRemainingBalance = Math.max(0, campaign.raisedAmount - totalSpent);

    res.json({
      success: true,
      data: {
        campaign,
        totalCollected: campaign.raisedAmount,
        totalSpent,
        netRemainingBalance,
        expenses,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add expense record with proof receipt
// @route   POST /api/donations/campaigns/:id/expenses
// @access  Private (Campaign creator or Admin)
const addExpenseRecord = async (req, res) => {
  try {
    const { title, amount, spentDate, proofImages, notes } = req.body;
    const campaign = await DonationCampaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    const isCreator = campaign.creator.toString() === req.user._id.toString();
    const isAdmin = isStaff(req.user);

    if (!isCreator && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to log expenses for this campaign' });
    }

    const expense = await DonationExpense.create({
      campaign: campaign._id,
      title,
      amount: parseFloat(amount),
      spentDate: spentDate ? new Date(spentDate) : new Date(),
      proofImages: Array.isArray(proofImages) ? proofImages : [],
      notes: notes || '',
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Expense record and proof uploaded to transparency ledger',
      data: expense,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createDonationCampaign,
  getDonationCampaigns,
  submitDonation,
  getFinancialTransparency,
  addExpenseRecord,
};
