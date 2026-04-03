Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    return new Response(Bun.file("./dist" + path));
  },
});
console.log("http://localhost:3000");
