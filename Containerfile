# First stage builds the application
FROM quay.io/sclorg/nodejs-22-c9s as builder

# Add application sources to a directory that the assemble script expects them
# and set permissions so that the container runs without root access
USER 0
COPY . /tmp/src
RUN chown -R 1001:0 /tmp/src
USER 1001

# Install the dependencies
RUN /usr/libexec/s2i/assemble

# Second stage copies the application to the minimal image
FROM quay.io/sclorg/nodejs-22-minimal-c9s

# Copy the application source and build artifacts from the builder image to this one
COPY --from=builder $HOME $HOME

EXPOSE 3000
# Set the default command for the resulting image
CMD /usr/libexec/s2i/run
