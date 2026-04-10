const express = require('express');
const app = express();
app.get('*', (req, res) => {
  res.sendFile(__dirname + '/does-not-exist.html');
});
const server = app.listen(3001, () => {
  console.log('Listening on 3001');
  fetch('http://localhost:3001/')
    .then(r => r.text())
    .then(text => console.log('Response:', text))
    .catch(err => console.error('Fetch error:', err))
    .finally(() => process.exit(0));
});
