const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`)
    res.status(404)
    next(error)
}

const errorHandler = async (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode
    let message = err.message

    if(err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404
        message = 'Resource not Found'
    }
    if (err.code === 11000) {
        statusCode = 400,
        message = 'Email already exists. Please use a different email'
      }

    res.status(statusCode).json({
        status: false,
        message,
        stack: process.env.NODE_ENV === 'DEVELOPMENT' ? err.stack : null
    })
}

module.exports = {
    notFound,
    errorHandler
}