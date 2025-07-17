const Owner = require('./Owner');
const { ApiError } = require('../../../errors/errorHandler');
const { deleteFile } = require('../../../utils/unLinkFiles');
const path = require('path');
const upload = require('../../../utils/upload');
const asyncHnadler = require('../../../utils/asyncHandler');
const Business = require('../Business/Business');

exports.getOwnerDetails = asyncHnadler(async (req, res, next) => {
  const id = req.owner.id || req.owner._id;
  // console.log(id);
  const owner = await Owner.findById(id).select('-password');
  // console.log(owner);
  if (!owner) {
    return next(new ApiError('Owner not found', 404));
  }
  res.status(200).json({
    success: true,
    message: 'Owner fetched successfully',
    owner
  });
});


exports.updateOwnerDetails = asyncHnadler(async (req, res, next) => {

  const id  = req.owner.id || req.owner._id;

  const owner = await Owner.findById(id);
  if (!owner) {
    return next(new ApiError('Owner not found', 404));
  }
  owner.name = req.body.name;
  owner.email = req.body.email;
  owner.phone = req.body.phone;
  owner.address = req.body.address;
  owner.city = req.body.city;
  owner.state = req.body.state;
  owner.zipCode = req.body.zipCode;
  owner.country = req.body.country;
  if (req.file) {
    owner.ownerPic = req.file.path; // upload the new image
    await deleteFile(owner.ownerPic); // delete the old image 
  }
  if (req.body.password) {
    owner.password = req.body.password;
  }
  await owner.save();
  res.status(200).json({
    success: true,
    message: 'Owner updated successfully',
    owner
  });
});

exports.deleteOwner = asyncHnadler(async (req, res, next) => {
  const id = req.owner.id || req.owner._id;
  const owner = await Owner.findByIdAndDelete(id);
  const businesses = await Business.find({ ownerId: id });
  for (const business of businesses) {
    await Business.findByIdAndDelete(business._id);
  }
  if (!owner) {
    return next(new ApiError('Owner not found', 404));
  }
  res.status(200).json({
    success: true,
    message: 'Owner deleted successfully',
    owner
  });
});

