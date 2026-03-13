pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'egame6688'
        APP_PORT = '3000'
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
                    bat "docker rm -f my-nest-app || exit 0"
                    bat "docker run -d -p %APP_PORT%:3000 --name my-nest-app -e PORT=3000 %DOCKER_IMAGE%:latest"
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