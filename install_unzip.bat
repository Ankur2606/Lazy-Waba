@echo off
echo Installing unzip utility from GnuWin32...

:: Create a temporary directory
mkdir %TEMP%\unzip_install
cd %TEMP%\unzip_install

:: Download GnuWin32 unzip package
curl -L "https://downloads.sourceforge.net/gnuwin32/unzip-5.51-1-bin.zip" -o unzip-bin.zip
curl -L "https://downloads.sourceforge.net/gnuwin32/unzip-5.51-1-dep.zip" -o unzip-dep.zip

:: Create installation directory if it doesn't exist
if not exist "C:\Program Files (x86)\GnuWin32" mkdir "C:\Program Files (x86)\GnuWin32"

:: Extract the files
echo Extracting files...
powershell -Command "Expand-Archive -Path unzip-bin.zip -DestinationPath ."
powershell -Command "Expand-Archive -Path unzip-dep.zip -DestinationPath ."

:: Copy files to GnuWin32 directory
xcopy /E /Y bin\* "C:\Program Files (x86)\GnuWin32\bin\"
xcopy /E /Y lib\* "C:\Program Files (x86)\GnuWin32\lib\"

:: Add GnuWin32 bin to PATH if not already there
echo Adding GnuWin32 to PATH...
powershell -Command "$currentPath = [Environment]::GetEnvironmentVariable('PATH', 'User'); if (-not $currentPath.Contains('GnuWin32\bin')) { [Environment]::SetEnvironmentVariable('PATH', $currentPath + ';C:\Program Files (x86)\GnuWin32\bin', 'User') }"

:: Clean up
cd %USERPROFILE%
rmdir /S /Q %TEMP%\unzip_install

echo Installation complete!
echo Please restart your command prompt or terminal before trying to build again.
echo.
echo After restarting, you can verify the installation by running: unzip -v
pause
