const express = require("express");
const app = express()
const {PrismaClient} = require("@prisma/client")
const prisma = new PrismaClient()
const hljs = require('highlight.js');
const MarkdownIt = require('markdown-it')
const emoji = require('markdown-it-emoji');

const md = new MarkdownIt({
    linkify: true,
    typographer: true,
});

md.use(emoji)

app.use(express.static('public'))
app.set('view engine', 'ejs');
app.use(express.urlencoded())
app.set("views", __dirname + "/views")
app.get("/", (req, res) => {
    res.render("index")
})

app.post("/paste", async (req, res) => {
    if(!req.body) {
        res.status(400).json({"error": "no post data."})
        return;
    }
    const { pasteContent, title, type } = req.body;
    let content;
    if (type == "code") {
        content = hljs.highlightAuto(pasteContent).value
    } else if (type == "markdown") {
        content = md.render(pasteContent)
    } else {
        content = pasteContent
    }

    const paste = await prisma.paste.create({
        data: {
            content: content,
            title: title,
            type: type
        }
    })
    res.render("pasted", {url: `http://localhost:3000/paste/${paste.id}`})
})


app.get("/paste/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const paste = await prisma.paste.findFirstOrThrow({
            where: {
                id: id
            },
            include: {
                comments: true
            }
        })
        res.render("paste", {
            content: paste.content.trim(),
            title: paste.title,
            type: paste.type,
            timestamp: new Date(paste.timestamp).toLocaleDateString(),
            comments: paste.comments,
            id: id
        })
    } catch (error) {
        //console.log(error)
        res.render("404")
    }
    
})

app.post("/paste/:id/comments", async (req, res) => {
    const {author, content} = req.body;

    if(content.length  > 210 || author.length > 50) {
        res.send("Message is longer than 210 characters or username is longer than 50 characters!")
        return;
    }

    const pasteId = req.params.id;
    const paste = await prisma.paste.findFirstOrThrow({
        where: {
            id: pasteId
        }
    })
    const comment = await prisma.comment.create({
        data: {
            body: md.render(content),
            name: author,
            pasteId: pasteId,

        }
    })
    res.redirect(`/paste/${pasteId}`)
})

app.get("*", (req, res) => {
    res.render("404")
})


app.listen(3000, () => {
    console.log("http://localhost:3000")
})

