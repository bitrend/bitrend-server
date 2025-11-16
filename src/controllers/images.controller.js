const imagesService = require('../services/images.service');

const getImages = async (req, res, next) => {
  try {
    const images = await imagesService.getImages();
    res.status(200).json({ images });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getImages
};
