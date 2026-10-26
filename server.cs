using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;

namespace TaskGuardServer
{
    class Program
    {
        private static HttpListener listener;
        private static string distPath;
        private const int Port = 5174;

        static void Main(string[] args)
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            distPath = Path.Combine(baseDir, "dist");

            if (!Directory.Exists(distPath))
            {
                // Fallback si corre desde subcarpeta
                distPath = Path.Combine(Directory.GetCurrentDirectory(), "dist");
            }

            if (!Directory.Exists(distPath))
            {
                Console.WriteLine("Error: dist folder not found at " + distPath);
                return;
            }

            string prefix = "http://localhost:" + Port + "/";
            listener = new HttpListener();
            listener.Prefixes.Add(prefix);

            try
            {
                listener.Start();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Server already running or error: " + ex.Message);
                return;
            }

            Console.WriteLine("TaskGuard Web Engine running on " + prefix);

            while (true)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                }
                catch
                {
                    break;
                }
            }
        }

        private static void ProcessRequest(object state)
        {
            HttpListenerContext context = (HttpListenerContext)state;
            try
            {
                string rawUrl = context.Request.Url.AbsolutePath.TrimStart('/');
                if (string.IsNullOrEmpty(rawUrl))
                {
                    rawUrl = "index.html";
                }

                // Normalizar ruta para evitar path traversal
                string safePath = rawUrl.Replace('/', Path.DirectorySeparatorChar);
                string filePath = Path.Combine(distPath, safePath);

                // Si no existe el archivo (rutas SPA de React/Vite), servir index.html
                if (!File.Exists(filePath))
                {
                    filePath = Path.Combine(distPath, "index.html");
                }

                byte[] buffer = File.ReadAllBytes(filePath);
                string extension = Path.GetExtension(filePath).ToLowerInvariant();

                string contentType = "application/octet-stream";
                switch (extension)
                {
                    case ".html":
                        contentType = "text/html; charset=utf-8";
                        break;
                    case ".js":
                    case ".mjs":
                        contentType = "application/javascript; charset=utf-8";
                        break;
                    case ".css":
                        contentType = "text/css; charset=utf-8";
                        break;
                    case ".json":
                        contentType = "application/json; charset=utf-8";
                        break;
                    case ".png":
                        contentType = "image/png";
                        break;
                    case ".jpg":
                    case ".jpeg":
                        contentType = "image/jpeg";
                        break;
                    case ".svg":
                        contentType = "image/svg+xml";
                        break;
                    case ".ico":
                        contentType = "image/x-icon";
                        break;
                    case ".woff":
                        contentType = "font/woff";
                        break;
                    case ".woff2":
                        contentType = "font/woff2";
                        break;
                    case ".ttf":
                        contentType = "font/ttf";
                        break;
                }

                context.Response.ContentType = contentType;
                context.Response.ContentLength64 = buffer.Length;
                context.Response.Headers.Add("Access-Control-Allow-Origin", "*");
                context.Response.Headers.Add("Cache-Control", "no-cache");
                context.Response.StatusCode = (int)HttpStatusCode.OK;

                context.Response.OutputStream.Write(buffer, 0, buffer.Length);
                context.Response.OutputStream.Close();
            }
            catch
            {
                try
                {
                    context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                    context.Response.Close();
                }
                catch { }
            }
        }
    }
}
