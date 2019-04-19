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
      const {ledgerNode} = req.ledgerAgent;
      const {maxBlockHeight, recordId} = req.body;
      const {getRecordHistory} = ledgerNode.storage.operations;
      const result = await getRecordHistory({maxBlockHeight, recordId});
      res.json(result);
    }));
});
