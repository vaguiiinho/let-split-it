import('node:http').then(({ request }) => {
  const req = request(
    {
      host: '127.0.0.1',
      port: process.env.PORT || 3000,
      path: '/',
      timeout: 3000,
    },
    (res) => {
      process.exit(res.statusCode >= 200 && res.statusCode < 500 ? 0 : 1);
    },
  );

  req.on('error', () => process.exit(1));
  req.on('timeout', () => {
    req.destroy();
    process.exit(1);
  });
  req.end();
});