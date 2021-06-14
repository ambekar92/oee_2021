/*
    This method is used to send response in case of a error
*/
var responseError = function(res, responseObject, message) {
    responseObject.status = false;
    responseObject.message = message;
    res.json(responseObject);
}

module.exports = responseError;