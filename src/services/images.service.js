const getImages = async () => {
  // 로컬에 저장된 이미지 리스트 반환
  // 실제로는 파일 시스템이나 DB에서 가져올 수 있음
  const images = [
    { id: 1, url: '/images/sample1.jpg', name: 'sample1.jpg' },
    { id: 2, url: '/images/sample2.jpg', name: 'sample2.jpg' },
    { id: 3, url: '/images/sample3.jpg', name: 'sample3.jpg' }
  ];

  return images;
};

module.exports = {
  getImages
};
