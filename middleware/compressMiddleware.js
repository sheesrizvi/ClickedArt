const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require("@aws-sdk/lib-storage");

const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

async function compressToExactSizeAndUpload(url, targetKB = 500) {

  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const buffer = Buffer.from(response.data);

  const targetBytes = targetKB * 1024;


  const megapixels = targetBytes / (100 * 1024); 
  const side = Math.sqrt(megapixels) * 1000;

  const resizedBuffer = await sharp(buffer)
    .resize({
      width: Math.round(side),
      height: Math.round(side),
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toBuffer();


  const outputBuffer = await sharp(resizedBuffer)
    .webp({
      quality: 80,
      effort: 6,
      nearLossless: false,
      smartSubsample: true,
      lossless: false,
      alphaQuality: 80,
    })
    .toBuffer();

  console.log(`Final size: ${(outputBuffer.byteLength / 1024).toFixed(2)} KB`);


  const fileName = `${Date.now()}_${Math.round(Math.random() * 1e9)}.webp`;

 const upload = new Upload({
      client: s3,
      params: {
        Bucket: process.env.AWS_BUCKET,
        Key: fileName,
        Body: outputBuffer,
      },
    });

  await upload.done();

  const s3Url = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_BUCKET_REGION}.amazonaws.com/${fileName}`;
  return s3Url;
}

module.exports = {
  compressToExactSizeAndUpload,
};
