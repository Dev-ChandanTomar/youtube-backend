import express from "express"
import { registerUser,loginUser,logoutUser,refreshAccessToken} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyjwt } from "../middlewares/auth.middleware.js";

const router=express.Router()

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",maxCount:1
        },
        {
            name:"coverImage",maxCount:1
        }
    ]),
     registerUser
)


router.route("/login").post(loginUser)
router.route("/refresh-token").post(refreshAccessToken)
//secure routes
router.route("/logout").post(verifyjwt,logoutUser)



export default router;