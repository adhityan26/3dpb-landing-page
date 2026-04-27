Import("env")
import shutil, os

src = os.path.join(env.get("PROJECT_DIR"), "include", "User_Setup.h")
dst_dir = os.path.join(env.get("PROJECT_LIBDEPS_DIR"), env.get("PIOENV"), "TFT_eSPI")
dst = os.path.join(dst_dir, "User_Setup.h")

if os.path.exists(dst_dir):
    shutil.copy(src, dst)
    print("User_Setup.h copied to TFT_eSPI")
