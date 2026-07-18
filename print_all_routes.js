const express = require('express');
const fs = require('fs');
const path = require('path');

// Mock express to capture routes
const routes = [];
const mockRouter = () => {
  const router = (req, res, next) => {};
  const methods = ['get', 'post', 'put', 'delete', 'use'];
  methods.forEach(method => {
    router[method] = (path, ...handlers) => {
      routes.push({ method: method.toUpperCase(), path });
      return router;
    };
  });
  return router;
};

// Mock express object
const mockExpress = () => {
  const app = (req, res, next) => {};
  const methods = ['get', 'post', 'put', 'delete', 'use', 'listen'];
  methods.forEach(method => {
    app[method] = (path, ...handlers) => {
      routes.push({ method: method.toUpperCase(), path });
      return app;
    };
  });
  app.use = (path, router) => {
    if (typeof path === 'string') {
      routes.push({ method: 'USE', path });
    }
    return app;
  };
  return app;
};

mockExpress.Router = mockRouter;
mockExpress.json = () => (req, res, next) => {};
mockExpress.static = () => (req, res, next) => {};

// Replace require('express') with mock
require.cache[require.resolve('express')] = {
  id: require.resolve('express'),
  filename: require.resolve('express'),
  loaded: true,
  exports: mockExpress
};

// Now load the route files and print them
try {
  const artworkRoutes = require('./routes/artworkRoutes.js');
  console.log('Artwork Routes:');
  console.log(routes);
} catch (err) {
  console.error(err);
}

process.exit(0);
