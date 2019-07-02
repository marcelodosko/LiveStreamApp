import React, { Component } from 'react';
import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    RTCView,
    MediaStream,
    MediaStreamTrack,
    mediaDevices
} from 'react-native-webrtc';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    Button,
    Alert
} from 'react-native';

class App extends Component {
    // Initial state
    constructor(props) {
    super(props);
    this.state = { 
      username: '',
      videoURL: null,
      videoURLRemote: null,
      isFront: true,
      pc: null,
      ws: new WebSocket('ws://192.168.0.27:3001'),
      otherUsername: null,
      login:false,
    };
  }

  componentWillMount() {
    const { ws } = this.state
    console.log('ws', ws)
    ws.onopen = () => {
      console.log('Connected to the signaling server')
    }

    ws.onerror = err => {
      console.error(err)
    }

    ws.onmessage = msg => {
      console.log('Got message', msg.data)

      const data = JSON.parse(msg.data)

      switch (data.type) {
        case 'login':
          this.handleLogin(data.success)
          break
        case 'offer':
          this.handleOffer(data.offer, data.username)
          break
        case 'answer':
          this.handleAnswer(data.answer)
          break
        case 'candidate':
          this.handleCandidate(data.candidate)
          break
        case 'close':
          this.handleClose()
          break
        default:
          break
      }
    }
  }

  sendMessage = message => {
    const { ws, otherUsername } = this.state

    if (otherUsername) {
      message.otherUsername = otherUsername
    }

    ws.send(JSON.stringify(message))
  }

  login = () => {
    const { username } = this.state
    if (username !== '') {
      this.sendMessage({
        type: 'login',
        username
      })
    }
  }

  handleLogin = async success => {
    if (success === false) {
      Alert.alert('error','😞 Username already taken')
    } else {

      const configuration = {"iceServers": [{"url": "stun:stun.l.google.com:19302"}]};
      const pc = new RTCPeerConnection(configuration);
      this.setState({ pc, login: success })
      let isFront = true;
      mediaDevices.enumerateDevices().then(sourceInfos => {
          let videoSourceId;
          for (let i = 0; i < sourceInfos.length; i++) {
            const sourceInfo = sourceInfos[i];
            if(sourceInfo.kind == "videoinput" && sourceInfo.facing == (isFront ? "front" : "back")) {
              videoSourceId = sourceInfo.deviceId;
            }
          }
          mediaDevices.getUserMedia({
            audio: true,
            video: {
              mandatory: {
                minWidth: 500, // Provide your own width, height and frame rate here
                minHeight: 300,
                minFrameRate: 30
              },
              facingMode: (isFront ? "user" : "environment"),
              optional: (videoSourceId ? [{sourceId: videoSourceId}] : [])
            }
          })
          .then(stream => {
                console.log(stream)
                this.setState({
                    videoURL: stream.toURL()
                });
                pc.addStream(stream);
            }, error => {
                console.log('Oops, we getting error', error.message);
                throw error;
            });
        });

         pc.onaddstream = event => {
           this.setState({
                    videoURLRemote:  event.stream.toURL()
                });
                 
        }
        pc.onicecandidate = (event) => {
            if (event.candidate) {
            this.sendMessage({
              type: 'candidate',
              candidate: event.candidate
            })
          }
        };
      }
  }
  
  callOtherUser = () => {
    const { pc } = this.state
    pc.createOffer().then(
    offer => {
      this.sendMessage({
        type: 'offer',
        offer: offer
      })

      pc.setLocalDescription(offer)
    });
  }

  handleOffer = (offer, username) => {
    const { pc } = this.state
    this.setState({ otherUsername: username })
    pc.setRemoteDescription(new RTCSessionDescription(offer))
    pc.createAnswer(
      answer => {
        pc.setLocalDescription(answer)
        this.sendMessage({
          type: 'answer',
          answer: answer
        })
      },
      error => {
        alert('Error when creating an answer')
        console.error(error)
      }
    )
  }

  handleAnswer = answer => {
    const { pc } = this.state
    pc.setRemoteDescription(new RTCSessionDescription(answer))
  }

  handleCandidate = candidate => {
    const { pc } = this.state
    pc.addIceCandidate(new RTCIceCandidate(candidate))
  }

  handleClose = () => {
    const { pc } = this.state
    this.setState({ otherUsername: null })
    pc.close()
    pc.onicecandidate = null
    pc.onaddstream = null
  }

  render() {
    const { login } = this.state
    return (
      <View style={styles.container}>
        { !login ?
          (
            <View>
              <Text style={styles.welcome}>ingrese Nombre!</Text>
              <TextInput
                style={{height: 40, width: 150, borderColor: 'gray', borderWidth: 1}}
                onChangeText={username => this.setState({username})}
                value={this.state.username}
              />
              <Button
                onPress={this.login}
                title="login"
                color="#841584"
              />
            </View>
          ) : (
            <View>
              <RTCView streamURL={this.state.videoURL} style={styles.containerVideo} />
              <RTCView streamURL={this.state.videoURLRemote} style={styles.containerVideo} />
              <Text style={styles.welcome}>connect with peer!</Text>
              <TextInput
                style={{height: 40, width: 250, borderColor: 'gray', borderWidth: 1}}
                onChangeText={otherUsername => this.setState({otherUsername})}
                value={this.state.otherUsername}
              />
              <Button
                onPress={this.callOtherUser}
                title="Call other user"
                color="#841584"
              /> 
              <Button
                onPress={this.handleClose}
                title="Close connection"
                color="#841584"
              /> 
            </View>
          )
        }
        <Text style={styles.welcome}>{this.state.messageR}</Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  containerVideo: {
        flex: 1,
        backgroundColor: '#ccc',
        borderWidth: 1,
        borderColor: '#000'
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

export default App;
