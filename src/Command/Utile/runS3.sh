docker run -v $(pwd)/authdata.json:/usr/src/app/conf/authdata.json -v $(pwd)/data:/usr/src/app/localData -v $(pwd)/metadata:/usr/src/app/localMetadata -p 8000:8000 -d scality/s3server
