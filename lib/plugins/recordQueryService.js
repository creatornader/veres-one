'use strict';

const {asyncHandler, express} = require('bedrock-express');
const bedrock = require('bedrock');
require('bedrock-ledger-context');

const router = express.Router();

module.exports = {
  type: 'ledgerAgentPlugin',
  api: {
    router,
    serviceType: 'urn:danubetech:record-query-service'
  }
};

// must delay defining router endpoints until validation schemas are loaded
// in `bedrock.init` handler in `bedrock-validation`
bedrock.events.on('bedrock.init', () => { 
  // FIXME: add validation and authentication
  router.post(
    '/', /* validate(),*/
    asyncHandler(async (req, res) => {
      const {node: ledgerNode} = req.ledgerAgent;
      const {maxBlockHeight, query} = req.body;
      const {getRecordHistory} = ledgerNode.storage.operations;
      const result = await getRecordHistory({maxBlockHeight, query});
      res.json(result);
    }));
});
