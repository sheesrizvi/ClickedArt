const jwt = require('jsonwebtoken')
const asyncHandler = require('express-async-handler')


const verifyToken = asyncHandler(async (req, res, next) => {
 
   const token = req.header("x-auth-token");
    if(!token) {
      return res.status(403).send({
            status: false,
            message: 'Token is required'
        })
    }
    const decoded = await jwt.verify(token, process.env.SECRET_KEY)
    req.user = decoded
    next()
})

const isAdmin = asyncHandler(async (req, res, next) => {
  
   const token = req.header("x-auth-token");
    if(!token) {
      return res.status(403).send({
            status: false,
            message: 'Token is required'
        })
    }
    
    const decoded = await jwt.verify(token, process.env.SECRET_KEY)
    if(decoded.type === 'Admin') {
        req.user = decoded
        next()
    } else {
        throw new Error('Not an Admin!')
    }
  
})

const IsPhotographer = asyncHandler(async (req, res, next) => {
  
   const token = req.header("x-auth-token");
    if(!token) {
      return res.status(403).send({
            status: false,
            message: 'Token is required'
        })
    }
    
    const decoded = await jwt.verify(token, process.env.SECRET_KEY)
    if(decoded.type === 'Photographer') {
        req.vendor = decoded
        next()
    } else {
        throw new Error('Not an Photographer!')
    }
  
})

const IsAdminOrPhotographer = asyncHandler(async (req, res, next) => {
  
  const token = req.header("x-auth-token");
    if(!token) {
      return res.status(403).send({
            status: false,
            message: 'Token is required'
        })
    }
    
    const decoded = await jwt.verify(token, process.env.SECRET_KEY)
    if(decoded.type === 'Admin' || decoded.type === 'Photographer') {
        req.user = decoded
        next()
    } else {
        throw new Error('Not an Admin or Photographer!')
    }
  
})



module.exports = {
    verifyToken, isAdmin, IsPhotographer , IsAdminOrPhotographer 
}