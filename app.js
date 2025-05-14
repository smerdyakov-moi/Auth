const express = require ('express')
const app = express()
const userModel = require ("./models/user")
const postModel = require ("./models/post")
const bcrypt = require ('bcrypt')
const jwt = require ('jsonwebtoken')
const cookieParser = require('cookie-parser')
const post = require('./models/post')
const multer = require ('multer')
const crypto = require ('crypto')
const path = require ('path')
const upload = require ('./configs/multer')
const user = require('./models/user')

app.set ('view engine','ejs')
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use (express.static(path.join(__dirname,'public')))

app.get('/',(req,res)=>{
    res.render('index')
})

app.get ('/profile',isLoggedin,async (req,res)=>{
    let user = await userModel.findOne({_id:req.user.userid}).populate("posts")
    res.render('profile',{user})
})

app.get('/showallposts', isLoggedin, async (req, res) => {
    let users = await userModel.find().populate("posts"); //.populate("posts")
    let USER = await userModel.findOne({_id:req.user.userid})
    const filteredUsers = users.filter(user => user._id.toString() !== req.user.userid);
    res.render('allposts', { userx: filteredUsers, USER}); 
   
})

app.get('/showallpostslike/:id', isLoggedin, async (req, res) => {
    let post = await postModel.findOne({_id:req.params.id})
    
    if (post.likes.indexOf(req.user.userid) === -1) {post.likes.push(req.user.userid)} // in array of likes, checking whether the user has already liked the post or not
    // this is achieved through passing the req.user.userid
    else {post.likes.splice(post.likes.indexOf(req.user.userid),1)}
    await post.save()
    res.redirect('/showallposts')
   
})

app.get ('/likers/:postid',isLoggedin, async(req,res)=>{
    let post= await postModel.findOne({_id:req.params.postid}).populate('likes')
    let {username} = await userModel.findOne({_id:req.user.userid})
    res.render('likedby',{post,username})

})

app.get ('/like/:id',isLoggedin,async (req,res)=>{
    let post = await postModel.findOne({_id:req.params.id})
    
    if (post.likes.indexOf(req.user.userid) === -1) {post.likes.push(req.user.userid)} // in array of likes, checking whether the user has already liked the post or not
    // this is achieved through passing the req.user.userid
    else {post.likes.splice(post.likes.indexOf(req.user.userid),1)}
    
    
    await post.save()
    res.redirect('/profile')
})

app.get ('/login', (req,res)=>{
    res.render('login')
})

app.get('/postedit/:id', async(req,res)=>{
    let post = await postModel.findOne({_id:req.params.id})
    res.render('editpost',{post})
})

app.get ('/postdelete/:id', isLoggedin, async(req,res)=>{
   // res.send('deleted')
    const {id}= req.params
    let deletedpost = await postModel.findOneAndDelete({_id:id})
    res.redirect('/profile')
})

app.post('/register',async (req,res)=>{
    let {email,password,username,name,age} = req.body
    let user = await userModel.findOne({email})
    if (user) return res.status(500).send('User already registered')
    
     let hash_pw = await bcrypt.hash(password,10)
     let createdUser = await userModel.create({
        email,password:hash_pw,username,name,age
     })
     let token = jwt.sign({email:email, userid: createdUser._id},'Secret')
     res.cookie('token',token)
     res.send(createdUser)
})

app.post('/login', async (req,res)=>{
    let {email,password} = req.body
    let user = await userModel.findOne({email})
    if (!user) return res.status(500).send('No user with such email!')

    bcrypt.compare(password, user.password, (err,result)=>{
        if (result) {
            let token = jwt.sign({email:email, userid: user._id},'Secret')
            res.cookie('token',token)
            res.redirect('/profile')
        }
        else {res.redirect('/login')}
    })
})

app.post('/createPost', isLoggedin, async(req,res)=>{
    let {caption,body} = req.body
    if (caption==="" || body==="") {
        return res.redirect('/profile')
    }
    let user = await userModel.findOne({_id:req.user.userid})
    let post = await postModel.create({
        user: user._id,
        caption,body,

    })
    user.posts.push(post._id)
    await user.save()
    res.redirect('/profile')
})

app.get('/editProfile', isLoggedin, async(req,res)=>{
    let user = await userModel.findOne({_id:req.user.userid})
    console.log(user)
    res.render('editprofile',{user})
})

app.post('/updateProfile', upload.single ('image') ,isLoggedin, async(req,res)=>{
    let {username,name} = req.body
    console.log(req.file)
    await userModel.findOneAndUpdate({_id:req.user.userid},{username,name},{new:true})
    res.redirect('/profile')
})

app.post ('/updatePost/:id', isLoggedin, async(req,res)=>{
    let {caption,body} = req.body
    let post = await postModel.findOneAndUpdate({_id:req.params.id},{caption,body}, {new:true})//.populate('user')
    res.redirect('/profile')
})

app.get('/logout', isLoggedin, (req,res)=>{
    res.cookie('token',"")
    res.redirect('/login')
})


function isLoggedin(req,res,next){
    const token  = req.cookies.token
    if(!token){
        return res.redirect("/login")
    }
    else{
        let data = jwt.verify( req.cookies.token,"Secret")
        req.user = data
        next()
}}

app.get('/test', isLoggedin, (req,res)=>{
    res.render('test')
})

app.post ('/uploadFile', upload.single('image'), isLoggedin,async (req,res)=>{
  const {filename} = req.file
  let user = await userModel.findOneAndUpdate({_id:req.user.userid},{pfp:filename})
  res.redirect('/profile')
})

app.post ('/removeProfilePic', isLoggedin, async (req,res)=>{
    let user = await userModel.findOneAndUpdate ({_id:req.user.userid},{pfp:'default.jpg'})
    res.redirect('/profile')
})

app.use((req, res) => {
  res.status(404).render('error', { title: 'Page Not Found' });
}) //error route handler


app.listen('3000',()=>{
    console.log('Listening...')
})