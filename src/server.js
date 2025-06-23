const app = require('./app');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST_URL || '0.0.0.0';


app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});


