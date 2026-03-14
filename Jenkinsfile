pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'egame6688'
        APP_PORT = '3030'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    // Build the multi-stage Dockerfile
                    bat "docker build -t %DOCKER_IMAGE%:%BUILD_ID% ."
                    bat "docker tag %DOCKER_IMAGE%:%BUILD_ID% %DOCKER_IMAGE%:latest"
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    // Try to stop existing container gracefully
                    bat "docker rm -f egame-api || exit 0"
                    
                    // Since .env is ignored in git, we need to pass sensitive variables properly
                    // Prefer using Jenkins Credentials binding instead of relying on local .env file in workspace
                    withCredentials([usernamePassword(credentialsId: 'egame6688_creds', usernameVariable: 'GAME_ACCOUNT', passwordVariable: 'GAME_PASSWORD')]) {
                        bat "docker run -d -p %APP_PORT%:3000 --name egame-api -e GAME_ACCOUNT=\"%GAME_ACCOUNT%\" -e GAME_PASSWORD=\"%GAME_PASSWORD%\" -e PORT=3000 %DOCKER_IMAGE%:latest"
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
