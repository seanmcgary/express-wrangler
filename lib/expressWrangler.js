'use strict';

const _ = require('lodash');
const logwrangler = require('logwrangler');
const uuid = require('node-uuid');

function GenerateRequestId(){
	return [Date.now(), uuid.v4()].join('|');
}

let requestLogger = function(options){
	options = options || {};
	
	const generateRequestId = typeof options.generateRequestId === 'function' ? options.generateRequestId : GenerateRequestId;

	let logger = options.logger || logwrangler.create({});

	return function(req, res, next){
		req.requestId = generateRequestId(req, res);

		let startTime = req.requestStartTime = Date.now();

		let oldEnd = res.end;

		res.end = function(chunk, encoding){
			let delta = Date.now() - startTime;

			let statusCode = res.statusCode;
			let isError = _.indexOf([4,5], ~~(res.statusCode / 100)) >= 0;

			let hasError = !!res.responseError;
			let logData = {
				level: (isError ? logger.levels.ERROR : logger.levels.INFO),
				message: [req.method, req.path].join(' '),
				data: {
					requestId: req.requestId,
					responseTime: delta,
					method: req.method,
					statusCode: statusCode
				}
			};

			if(hasError){
				logData.data = _.extend(logData.data, {
					error: res.responseError.error || {},
					errorData: res.responseError.data || {}
				});
			}
			logger.log(logData);

			oldEnd.apply(res, _.values(arguments));
		};

		next();
	};
};
module.exports = requestLogger;
