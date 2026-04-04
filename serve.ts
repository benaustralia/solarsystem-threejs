Bun.serve({
  port: 3000,
  hostname: '0.0.0.0',
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    return new Response(Bun.file("./dist" + path));
  },
});
console.log("http://localhost:3000 (also http://192.168.4.223:3000 for LAN)");
