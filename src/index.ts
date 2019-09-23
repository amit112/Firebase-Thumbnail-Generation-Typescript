import * as functions from "firebase-functions";
import { tmpdir } from "os";
import { join, dirname } from "path";
import * as storage from "@google-cloud/storage";
const gcs = new storage.Storage();
require("typescript-require");
const sharp = require("sharp");
import * as fs from "fs-extra";
import * as admin from "firebase-admin";
const firebase = admin.initializeApp(functions.config().firebase);
const bucketName = "testthumbnail-991fe.appspot.com";
exports.generateThumbnail = functions.https.onRequest(async () => {
  const bucket = gcs.bucket(bucketName);
  await bucket.getFiles().then(async (result: any) => {
    // tslint:disable-next-line:prefer-for-of
    for (let index = 0; index < result.length; index++) {
      result[index].forEach(async (image:any) => {
      const filePath: any = image.name; // File path in the bucket.
      const fileName = filePath.split("/").pop();
      const bucketDir = dirname(filePath);
      const workingDir = join(tmpdir(), "thumbs");

      const tempFilePath = join(workingDir, `${fileName}`);
      if (
        fileName.startsWith("thumb@") ||
        !fileName.match(/.(jpg|jpeg|png|gif)$/i)
      ) {
        console.log(`Already a Thumbnail. or file is not valid`);
        return;
      }
      console.log(workingDir);
      await fs.ensureDir(workingDir);
      const thumbFileName =
        fileName !== `thumb@_${fileName}` ? `thumb@_${fileName}` : fileName;
      const thumbFilePath = join(workingDir, thumbFileName);
      await bucket
        .file(filePath)
        .download({
          destination: tempFilePath
        })
        .then(async () => {
          await sharp(tempFilePath)
            .resize(100, 100)
            .toFile(thumbFilePath);
          console.log(thumbFilePath);
        })
        .then(async () => {
          await bucket.upload(thumbFilePath, {
            destination: join(bucketDir, thumbFileName)
          });
        })
        .then(() => {
          console.log("done");
          return fs.remove(workingDir);
        });
        
      });
    }
    
  
  });
});

exports.deleteImages = functions.https.onRequest(() => {
  const bucket = firebase.storage().bucket(bucketName);
  return bucket.deleteFiles({
    prefix: `thumb@`
  });
});

// sheduler function for deleting files
//   exports.deleteImages = functions.pubsub.schedule('1 11 * * *').onRun((context) => {
//     const bucket = firebase.storage().bucket(bucketName);
//     return bucket.deleteFiles({
//         prefix: `thumb@`
//     });
// });
