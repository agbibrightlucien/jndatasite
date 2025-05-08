const homeController = {
  welcome: (req, res) => {
    res.json({ message: 'Welcome to JN Data Site API' });
  },

  healthCheck: (req, res) => {
    res.json({ status: 'ok' });
  }
};

module.exports = homeController;