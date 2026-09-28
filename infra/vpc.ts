/**
 * VPC mínima para abaratar costos: 2 subredes privadas (RDS exige 2 AZ), 1 pública y
 * UNA sola instancia NAT fck-nat t4g.nano (~USD 7/mes con IPv4) en vez de una por AZ.
 * El tráfico a S3 va por un gateway endpoint gratuito.
 * La instancia NAT también sirve de bastión vía SSM para conectarse a la base (QGIS, psql).
 */
const CIDR = "10.20.0.0/16";
const AZS = ["us-east-1a", "us-east-1b"];

export function createVpc() {
  const vpc = new aws.ec2.Vpc("Vpc", {
    cidrBlock: CIDR,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { Name: `${$app.name}-${$app.stage}` },
  });

  const igw = new aws.ec2.InternetGateway("Igw", { vpcId: vpc.id });

  const publicSubnet = new aws.ec2.Subnet("PublicSubnet", {
    vpcId: vpc.id,
    cidrBlock: "10.20.0.0/24",
    availabilityZone: AZS[0],
    mapPublicIpOnLaunch: true,
    tags: { Name: `${$app.name}-public` },
  });
  const publicRt = new aws.ec2.RouteTable("PublicRouteTable", {
    vpcId: vpc.id,
    routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: igw.id }],
  });
  new aws.ec2.RouteTableAssociation("PublicRta", { subnetId: publicSubnet.id, routeTableId: publicRt.id });

  const natSg = new aws.ec2.SecurityGroup("NatSg", {
    vpcId: vpc.id,
    description: "fck-nat",
    ingress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: [CIDR] }],
    egress: [{ protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] }],
  });

  const natRole = new aws.iam.Role("NatRole", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ec2.amazonaws.com" }),
    managedPolicyArns: ["arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"],
  });
  const natProfile = new aws.iam.InstanceProfile("NatProfile", { role: natRole.name });

  const ami = aws.ec2.getAmiOutput({
    owners: ["568608671756"], // fck-nat
    mostRecent: true,
    filters: [
      { name: "name", values: ["fck-nat-al2023-*"] },
      { name: "architecture", values: ["arm64"] },
    ],
  });

  const nat = new aws.ec2.Instance("Nat", {
    ami: ami.id,
    instanceType: "t4g.nano",
    subnetId: publicSubnet.id,
    // Default SG: así el bastión puede llegar a RDS.
    vpcSecurityGroupIds: [natSg.id, vpc.defaultSecurityGroupId],
    sourceDestCheck: false,
    associatePublicIpAddress: true,
    iamInstanceProfile: natProfile.name,
    rootBlockDevice: { volumeSize: 8, volumeType: "gp3" },
    tags: { Name: `${$app.name}-nat` },
  }, { ignoreChanges: ["ami"] });

  const privateRt = new aws.ec2.RouteTable("PrivateRouteTable", {
    vpcId: vpc.id,
    routes: [{ cidrBlock: "0.0.0.0/0", networkInterfaceId: nat.primaryNetworkInterfaceId }],
  });

  const privateSubnets = AZS.map((az, i) => {
    const subnet = new aws.ec2.Subnet(`PrivateSubnet${i}`, {
      vpcId: vpc.id,
      cidrBlock: `10.20.${10 + i}.0/24`,
      availabilityZone: az,
      tags: { Name: `${$app.name}-private-${az}` },
    });
    new aws.ec2.RouteTableAssociation(`PrivateRta${i}`, { subnetId: subnet.id, routeTableId: privateRt.id });
    return subnet;
  });

  new aws.ec2.VpcEndpoint("S3Endpoint", {
    vpcId: vpc.id,
    serviceName: "com.amazonaws.us-east-1.s3",
    vpcEndpointType: "Gateway",
    routeTableIds: [privateRt.id],
  });

  return {
    privateSubnets: privateSubnets.map((s) => s.id),
    securityGroups: [vpc.defaultSecurityGroupId],
    natInstanceId: nat.id,
  };
}
