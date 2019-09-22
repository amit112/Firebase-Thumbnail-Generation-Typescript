import * as functions from 'firebase-functions';
import * as storage from '@google-cloud/storage';
const gcs = new storage.Storage();
import { tmpdir } from 'os';
import { join, dirname } from 'path';
require('typescript-require');
// Get functions.ts
const sharp = require('sharp');
import * as fs from 'fs-extra';
import * as admin from 'firebase-admin';
const firebase= admin.initializeApp(functions.config().firebase); 
exports.generateThumbnail =  functions.storage.object().onFinalize( async (object) => {
    console.log('start');
    const fileBucket = gcs.bucket(object.bucket); // The Storage bucket that contains the file.
    const filePath: any =  object.name; // File path in the bucket.
    const fileName = filePath.split('/').pop();
    const bucketDir = dirname(filePath);
    const workingDir = join(tmpdir(), 'thumbs');
    const tempFilePath = join(workingDir, `abc${fileName}`);
    if ( fileName.startsWith('thumb@') ||
      !String(object.contentType).startsWith('image/')
    ) {
       console.log(`Already a Thumbnail. or file is not valid`);
      return;
    }
    console.log(workingDir);
    await fs.ensureDir(workingDir);
    const thumbFileName = fileName !== `thumb@_${fileName}` ? `thumb@_${fileName}` : fileName;
    const thumbFilePath = join(workingDir, thumbFileName);
    console.log(thumbFilePath);
    await fileBucket.file(filePath).download({
      destination: tempFilePath
    }).then( async () => {
      await sharp(tempFilePath).resize(100, 100).toFile(thumbFilePath);
      console.log(thumbFilePath);
    }).then(async ()=> {
      await fileBucket.upload(thumbFilePath, {
        destination: join(bucketDir, thumbFileName)
      });
    }).then(async ()=>{
      console.log('done');
      return fs.remove(workingDir).then(()=>{
          return fs.remove(bucketDir);
      });
    });
  });


  exports.deleteImages = functions.https.onRequest(()=> {
        const bucket = firebase.storage().bucket('testthumbnail-991fe.appspot.com');
        return bucket.deleteFiles({
            prefix: `thumb@`
        });
      });

  // sheduler function for deleting files
//   exports.deleteImages = functions.pubsub.schedule('1 11 * * *').onRun((context) => {
//     const bucket = firebase.storage().bucket('testthumbnail-991fe.appspot.com');
//     return bucket.deleteFiles({
//         prefix: `thumb@`
//     });
// });
