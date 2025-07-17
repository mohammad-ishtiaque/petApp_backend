const app = require('./app');

const PORT = process.env.PORT || 5000;
const HOST = process.env.BASE_URL || '0.0.0.0';


app.listen(PORT, HOST, () => {
  console.log(`Pet App Server is running on http://${HOST}:${PORT}`);
});


