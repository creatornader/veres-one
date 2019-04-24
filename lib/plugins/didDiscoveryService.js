'use strict';

module.exports = {
  type: 'ledgerStoragePlugin',
  api: {
    expandIndexes: async ({createIndexes, collections}) => {
      // TODO: add indexes in support of expected queries
      await createIndexes([{
        collection: collections.operationCollection,
        fields: {'operation.record.type': 1},
        options: {unique: false, background: false, name: 'danubeIndex1'}
      }]);
    },
    storage: {
      operations: {
        // NOTE: do not use arrow functions here because this function is to be
        // bound to the class instance
        danubeQuery: async function({maxBlockHeight, query}) {
          const {
            eventCollection, collection: operationCollection,
            util: {assert, dbHash, BedrockError}
          } = this;

          // NOTE: `collection` is now the operations collection, and you
          // have `eventCollection` as well.

          assert.number(maxBlockHeight, 'maxBlockHeight');
          assert.object(query, 'query');

          const eventQuery = {
            'event.type': 'WebLedgerOperationEvent',
            'meta.blockHeight': {$lte: maxBlockHeight},
            'meta.consensus': {$exists: true},
          };

          let result;
          try {
            result = await eventCollection.aggregate(
              // your mongo query here
            ).toArray();
          } catch(err) {
            if(err.code === 40228) {
              throw new BedrockError(
                'Not Found.', 'NotFoundError',
                {httpStatusCode: 404, public: true}, err);
            }
            throw err;
          }
          if(result.length === 0) {
            throw new BedrockError(
              'Not Found.', 'NotFoundError',
              {httpStatusCode: 404, public: true});
          }
          return result[0];
        }
      }
    }
  }
};