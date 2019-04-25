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
            eventCollection, collection,
            util: {assert, dbHash, BedrockError}
          } = this;

          // NOTE: `collection` is now the operations collection, and you
          // have `eventCollection` as well.

          // assert.number(maxBlockHeight, 'maxBlockHeight');
          assert.object(query, 'query');

          // const eventQuery = {
          //   'event.type': 'WebLedgerOperationEvent',
          //   'meta.blockHeight': {$lte: maxBlockHeight},
          //   'meta.consensus': {$exists: true},
          // };

          let result;

          try {
            // const query = {};
            console.log('QQQQQQQQQQQQQQQQq', query);
            result = await collection.find(
                query
              // your mongo query here
            ).toArray();
            /*
            const query = {recordId: database.hash(recordId)};

            const eventMatch = {'meta.eventMeta.consensus': true};
            if(maxBlockHeight) {
              eventMatch['meta.eventMeta.blockHeight'] = {$lte: maxBlockHeight};
            }

            const records = await this.collection.aggregate([
              {$match: query},
              {$project: {_id: 0}},
              {$lookup: {
                from: this.eventCollectionName,
                let: {eventHash: '$meta.eventHash'},
                pipeline: [
                  {$match: {$expr: {$eq: ['$meta.eventHash', '$$eventHash']}}},
                  {$project: {
                    _id: 0,
                    'meta.consensus': 1,
                    'meta.blockHeight': 1,
                    'meta.blockOrder': 1
                  }},
                  {$replaceRoot: {newRoot: '$meta'}}
                ],
                as: 'meta.eventMeta'
              }},
              {$unwind: '$meta.eventMeta'},
              {$match: eventMatch},
              {$sort: {
                'meta.eventMeta.blockHeight': 1,
                'meta.eventMeta.blockOrder': 1,
                'meta.eventOrder': 1
              }},
            ], {allowDiskUse: true}).toArray();
            if(records.length === 0) {
              throw new BedrockError(
                'Failed to get history for the specified record.',
                'NotFoundError', {
                  httpStatusCode: 404,
                  maxBlockHeight,
                  public: true,
                  recordId
                });
            }
          */
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
          return result;
        }
      }
    }
  }
};
