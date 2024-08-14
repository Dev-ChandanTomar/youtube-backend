import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
const generateAccessAndRefreshTokens=async(userId)=>{
    try {
        const user= await User.findById(userId);
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforesave:false})

        return{accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(500,"something wants wrong during generation of access and refresh token")
    }
}

const registerUser=asyncHandler(async(req,res)=>{
   //check user detail get from frontend

 const {fullName,username,email,password} =req.body
 
 //validation not empty

 if(fullName===""){
    throw new ApiError(400,"fullname is required")
 }
 if(username===""){
    throw new ApiError(400,"username is required")
 }

 if(email===""){
    throw new ApiError(400,"email is required")
 }

 if(password===""){
    throw new ApiError(400,"password is required")
 }

    //check if user already existed:username,email

 const existedUser= await User.findOne({
    $or:[{username},{email}]
 })  
 
 if(existedUser){
    throw new ApiError(409,"user with email,username Already existed")
 }

 //check for image check for avatar

 const avatarLocalPath=req.files?.avatar?.[0]?.path;
//  const coverImageLocalPath=req.files?.coverImage?.[0].path;
let coverImageLocalPath;
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
    coverImageLocalPath=req.files.coverImage[0].path;
}

 if(!avatarLocalPath){
    throw new ApiError(400,"avatar file is required")
 }

//  if(coverImageLocalPath){
//     throw new ApiError(400,"cover  imagefile is required")
//  }


  //upload them to cloudinary,avatar
 const avatar=await uploadOnCloudinary(avatarLocalPath)
 const coverImage=await uploadOnCloudinary(coverImageLocalPath)


 if(!avatar){
    throw new ApiError(400,"user avatar is required")
 }

//create use object-create object in db

 const user = await User.create({
    fullName,
    avatar:avatar.url,
    coverImage:coverImage?.url || "" ,
    email,
    password,
    username:username.toLowerCase()
 })


//remove password and refress token from response
 const userCreated= await User.findById(user._id).select("-password -refreshToken")

//check for user creation
 if(!userCreated){
    throw new ApiError(500 ,"something wrong while adding data to database")
 }

 return res.status(201).json(
    new ApiResponse(200, userCreated,"User registered Successfully")
 )


})


const loginUser=asyncHandler(async(req,res)=>{
   
try {
        //taking data from request
        const { username,email,password } =req.body
        
      
        //username or email present or not
        if(!username && !email){
            throw new ApiError(400,"username or email required")
        }
    
         //find the user 
        const user=  await User.findOne({$or :[{username},{email}]})
        
        if(!user){
            throw new ApiError(400,"user not available")
        }
    
        //password check
        
        const isPasswordValid =await user.isPasswordcorrect(password)
       
        if(!isPasswordValid){
            throw new ApiError(401,"invalid password")
        }
        //authentication generate access and refresh token
    
       const{accessToken,refreshToken}= await generateAccessAndRefreshTokens(user._id)
        //send it on cookies
       
        const loggedInUser=await User.findById(user._id).select("-password -refreshToken")
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        return res.status(200)
                  .cookie("accessToken",accessToken,options)
                  .cookie("refreshToken",refreshToken,options)
                  .json(
                    new ApiResponse(200,{
                        user:accessToken,loggedInUser,refreshToken
                    },
                    "User LoggedIn Successfully"
                )
                  )
} catch (error) {
    console.log("error",error)
    throw new ApiError(500,"login api failed")
}
})


const refreshAccessToken=asyncHandler(async(req,res)=>{

  const incomingRefreshToken =req.cookies.refreshToken || req.body.refreshToken
 
  if(!incomingRefreshToken){
    throw new ApiResponse(401,"unauthorised request")
  }

  const decodedToken=jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)

 const user= await User.findById(decodedToken._id)
 if(!user){
    throw ApiError(401,"invalid refresh token")
 }

 if(incomingRefreshToken !== user.refreshToken){
    throw ApiError(401,"Refresh token is expired or used")
 }

 const options={
    httpOnly:true,
    secure:true
}

const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)

 return res.status(200)
          .cookies("accessToken",accessToken,options)
          .cookies("refreshToken",newRefreshToken,options)
          .json(new ApiResponse(
            200,
            {accessToken,refreshToken:newRefreshToken},
            "access token refreshed"
          ))

})



const logoutUser=asyncHandler(async(req,res)=>{
  await User.findByIdAndUpdate(
    req.user._id,
    {
        $set:{
            refreshToken:undefined
        }
  },{
    new:true
})

const options={
    httpOnly:true,
    secure:true
}
return res.status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json( new ApiResponse(200,{},"user loggedout successfully"))
})

export {registerUser,loginUser,logoutUser,refreshAccessToken}