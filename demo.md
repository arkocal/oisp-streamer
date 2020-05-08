# How to set-up demo for oisp-streamer

1. Deploy oisp normally, make sure there are at least two flink-taskmanagers. (See https://github.com/arkocal/platform-launcher/tree/services)
2. Build the keycloak image as in the linked repository, or update `values.yaml` to use `arkocal/oisp-keycloak` instead of `oisp/keycloak`
3. OISP should be working normally. Now the streamer and the service should be deployed.
3.1. https://github.com/arkocal/oisp-services is the working clone for the service. (`develop` branch, `splitcomponents` directory)
3.2. Build the service as flink application `mvn clean package -DskipTests -Dcheckstyle.skip -Pflink-runner`
3.3. Submit the application using `deployer.py`. (`kubefwd` must be running) or the flink dashboard.
3.4. Verify the service is running using the flink dashboard, or kafkacat. For every (cid, aid, value) entry in
kafka channel `metrics`, there should be an entry in the channel `metrcis.cid.aid` with the same content.
3.5. Update `deployment.yaml` to use image `arkocal/oisp-streamer`. Deploy the streamer application, with `kubectl -n oisp apply -f deployment.yaml` and port forward 9000 to localhost.
3.6. See `client.js` for client-side usage.
