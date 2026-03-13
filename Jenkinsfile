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
                    sh "docker build -t ${DOCKER_IMAGE}: ."
                    sh "docker tag ${DOCKER_IMAGE}: ${DOCKER_IMAGE}:latest"
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    // Try to stop existing container gracefully
                    sh "docker rm -f my-nest-app || true"
                    sh "docker run -d -p ${APP_PORT}:3000 --name my-nest-app -e PORT=3000 ${DOCKER_IMAGE}:latest"
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
