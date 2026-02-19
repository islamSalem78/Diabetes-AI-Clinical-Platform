Write-Host "Adding all changes to git..."
git add .

Write-Host "Committing changes..."
git commit -m "Deploy Diabetes AI Clinical Platform with GitHub Pages configuration"

Write-Host "Pushing to GitHub..."
git push origin main

Write-Host "Deployment setup complete!"
Write-Host "The frontend will automatically deploy to GitHub Pages via GitHub Actions."
Write-Host "Remember to deploy the backend separately to a Node.js hosting service."
Write-Host "Check DEPLOYMENT.md for complete deployment instructions."