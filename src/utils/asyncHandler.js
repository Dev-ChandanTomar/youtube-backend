// const asyncHandler=()=>{}


const asyncHandler = (fun) =>async(req,res,next)=>{
try {
  return  await fun(req,res,next)
} catch (error) {
    res.status(500).json({
        success:false,
        message:error.message
    })
    
}

}


export {asyncHandler}