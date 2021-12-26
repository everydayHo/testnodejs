var http = require('http');
var fs = require('fs');
var url = require('url');
var qs = require('querystring');
var path = require('path');
const sanitizeHtml = require('sanitize-html');
function templateHTML(title, list, body, control) {
  return `
  <!doctype html>
<html>
<head>
  <title>WEB1 - ${title}</title>
  <meta charset="utf-8">
  <style>
  body {
    width: 500px;
    height: 500px;
    background-color: bisque;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: dimgray;
    list-style-type=circle;
    
  }
  a{
  text-decoration:none;    
  color:seagreen;
  }
  
  </style>
</head>
<body>
  <h1><a href="/">WEB</a></h1>
    ${list}
    ${control}
  ${body}
  
</body>
</html>
   `;
}

function templateList(filelist) {
  var list = '<ul>';
  var i = 0;

  while (i < filelist.length) {
    list = list + `<li><a href="/?id=${filelist[i]}">${filelist[i]}</a></li>`;
    i = i + 1;
  }
  list = list + '</ul>';
  return list;
}

var app = http.createServer(function (request, response) {
  var _url = request.url;
  var queryData = url.parse(_url, true).query;
  var pathname = url.parse(_url, true).pathname;

  if (pathname === '/') {
    if (queryData.id === undefined) {
      fs.readdir('./data', function (error, filelist) {
        var title = 'Welcome';
        var description = 'Hello Node.js';
        var list = templateList(filelist);
        var template = templateHTML(
          title,
          list,
          `<h2>${title}</h2>${description}`,
          `<a href="/create">create</a>`
        );
        response.writeHead(200);
        response.end(template);
      });
    } else {
      fs.readdir('./data', function (error, filelist) {
        var filteredId = path.parse(queryData.id).base;
        var list = templateList(filelist);
        fs.readFile(`data/${filteredId}`, 'utf8', function (err, description) {
          var title = queryData.id;
          var sanitizedTitle = sanitizeHtml(title);
          var sanitizedDescription = sanitizeHtml(description);
          var template = templateHTML(
            title,
            list,
            `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
            `<a href="/create">create</a>
              <a href = "/update?id=${sanitizedTitle}">update</a>
              <form action="delete_process" method="post" >
              <input type = "hidden" name = "id" value="${sanitizedTitle}">
              <input type = "submit" value = "delete">
              </form>`
          );
          response.writeHead(200);
          response.end(template);
        });
      });
    }
  } else if (pathname === '/create') {
    fs.readdir('./data', function (error, filelist) {
      var title = 'WEB-create';

      var list = templateList(filelist);
      var template = templateHTML(
        title,
        list,
        `<form action="/create_process" method="post">
        <p><input type="text" name="title" placeholder="제목"/></p>
        <p>
          <textarea name="description" id="story" cols="40" rows="20" placeholder="글적으셈"></textarea>
        </p>
        <p>
          <input type="submit" />
        </p>
      </form>
      `,
        ''
      );
      response.writeHead(200);
      response.end(template);
    });
  } else if (pathname === '/create_process') {
    var body = '';

    request.on('data', function (data) {
      body += data;

      // Too much POST data, kill the connection!
      // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
      if (body.length > 1e6) request.connection.destroy();
    });

    request.on('end', function () {
      var post = qs.parse(body);
      // use post['blah'], etc.
      var title = post.title;
      var description = post.description;
      fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
        response.writeHead(302, { Location: `/?id=${title}` });
        response.end();
      });
    });
  } else if (pathname === '/update') {
    fs.readdir('./data', function (error, filelist) {
      var list = templateList(filelist);
      fs.readFile(`data/${queryData.id}`, 'utf8', function (err, description) {
        var title = queryData.id;
        var template = templateHTML(
          title,
          list,
          `
          <form action="/update_process" method="post">
          <input type="hidden" name = "id" value = "${title}"/>
        <p><input type="text" name="title" placeholder="제목" value ='${title}'></p>
        <p>
          <textarea name="description" id="description" cols="40" rows="20" placeholder="글적으셈">${description}</textarea>
        </p>
        <p>
          <input type="submit" />
        </p>
      </form>
          
          `,
          `<a href="/create">create</a>
            <a href = "/update?id=${title}">update</a>`
        );
        response.writeHead(200);
        response.end(template);
      });
    });
  } else if (pathname === '/update_process') {
    var body = '';

    request.on('data', function (data) {
      body += data;

      if (body.length > 1e6) request.connection.destroy();
    });

    request.on('end', function () {
      var post = qs.parse(body);

      var id = post.id;
      var title = post.title;
      var description = post.description;
      fs.rename(`data/${id}`, `data/${title}`, function (error) {
        fs.writeFile(`data/${title}`, description, 'utf8', function (err) {
          response.writeHead(302, { Location: `/?id=${title}` });
          response.end();
        });
      });
    });
  } else if (pathname === '/delete_process') {
    var body = '';

    request.on('data', function (data) {
      body += data;

      if (body.length > 1e6) request.connection.destroy();
    });

    request.on('end', function () {
      var post = qs.parse(body);
      var id = post.id;
      var filteredId = path.parse(id).base;
      fs.unlink(`data/${filteredId}`, function (error) {
        response.writeHead(302, { Location: `/` });
        response.end();
      });
    });
  } else {
    response.writeHead(404);
    response.end('Not Found');
  }
});
app.listen(3000);
