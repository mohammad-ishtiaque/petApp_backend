const fs = require('fs');
const path = require('path');
const util = require('util');
const unlink = util.promisify(fs.unlink);

const deleteFile = async (filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      console.log('No file path provided or file does not exist:', filePath);
      return;
    }

    const uploadsPath = path.join(__dirname, '..', '..', 'uploads');
    const localFilePath = path.join(uploadsPath, filePath);

    if (fs.existsSync(localFilePath)) {
      await unlink(localFilePath);
    }

    await unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

module.exports = { deleteFile };