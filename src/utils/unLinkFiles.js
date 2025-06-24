const fs = require('fs');
const util = require('util');
const unlink = util.promisify(fs.unlink);

const deleteFile = async (filePath) => {
  try {
    if (!filePath) {
      console.log('No file path provided');
      return;
    }

    // Check if file exists
    if (fs.existsSync(filePath)) {
      await unlink(filePath);
      // console.log('File deleted successfully:', filePath);
    } else {
      // console.log('File does not exist:', filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

module.exports = { deleteFile };