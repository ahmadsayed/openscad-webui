import express from 'express';

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { unixfs } from '@helia/unixfs'
import { bootstrap } from '@libp2p/bootstrap'
import { tcp } from '@libp2p/tcp'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { createHelia } from 'helia'
import { createLibp2p } from 'libp2p'
import { identifyService } from 'libp2p/identify'

const app = express();
const PORT = 3000;

app.use(express.urlencoded());
app.use(express.json());
async function createNode() {
  // the blockstore is where we store the blocks that make up files
  const blockstore = new MemoryBlockstore()

  // application-specific data lives in the datastore
  const datastore = new MemoryDatastore()

  // libp2p is the networking layer that underpins Helia
  const libp2p = await createLibp2p({
    datastore,
    addresses: {
      listen: [
        '/ip4/127.0.0.1/tcp/0'
      ]
    },
    transports: [
      tcp()
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      yamux()
    ],
    peerDiscovery: [
      bootstrap({
        list: [
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
          '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt'
        ]
      })
    ],
    services: {
      identify: identifyService()
    }
  })

  return await createHelia({
    datastore,
    blockstore,
    libp2p
  })
}
// const node = await createNode();

// // create a filesystem on top of Helia, in this case it's UnixFS
// const ipfs = unixfs(node);
// // we will use this TextEncoder to turn strings into Uint8Arrays
// const encoder = new TextEncoder()
// // add the bytes to your node and receive a unique content identifier
// const emptyDirCid = await ipfs.addDirectory('/foo')
// const dirCid = await ipfs.mkdir(emptyDirCid, 'foo')
// const res = await ipfs.addFile({
//   content: encoder.encode("Helloo The8re")
// })
// const updatedCid = await ipfs.cp(res, dirCid, "testfile2")
// console.log(updatedCid.toString());
// for await  (const file of ipfs.ls(updatedCid)) {
//   console.log(file.name);
// }

// app.use(connectLiveReload());
app.post('/save', (req, res) => {
  console.log(req.body);
  res.json({
    result: "success"
  });
});
app.use(express.static('public'));
app.listen(PORT, () => console.log(`Server listening on port: ${PORT}`));