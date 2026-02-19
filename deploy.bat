@echo off
echo Adding all changes to git...
git add .
echo Committing changes...
git commit -m "Deploy Diabetes AI Clinical Platform with GitHub Pages configuration"
echo Pushing to GitHub...
git push origin main
echo Deployment setup complete!
echo The frontend will automatically deploy to GitHub Pages via GitHub Actions.
echo Remember to deploy the backend separately to a Node.js hosting service.
echo Check DEPLOYMENT.md for complete deployment instructions.